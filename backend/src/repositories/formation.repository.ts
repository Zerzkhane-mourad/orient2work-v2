import { type Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/**
 * Deux formes de lecture :
 *  • `listSelect` — le catalogue, SANS le contenu du cours (payload léger) ;
 *  • `detailInclude` — le lecteur, avec le contenu et le quiz.
 *
 * Dans les deux cas `bonneReponse` est chargé mais jamais sérialisé vers un jeune :
 * c'est le mapper qui décide (voir formation.mapper.ts).
 */
const listSelect = {
  id: true,
  titre: true,
  sousTitre: true,
  description: true,
  // La catégorie est une relation depuis qu'elle est administrable : le mapper
  // n'expose que son nom, l'API garde donc le même contrat qu'avant.
  categorie: { select: { id: true, nom: true } },
  // Même traitement pour la filière, elle aussi administrable.
  filiere: { select: { id: true, nom: true } },
  image: true,
  tempsLectureMin: true,
  note: true,
  nombreAvis: true,
  niveau: true,
  instructeur: true,
  populaire: true,
  certifiante: true,
  objectifs: true,
  prerequis: true,
  publiee: true,
  createdAt: true,
  updatedAt: true,
  // Chargé uniquement pour compter les chapitres (`<h2>`) : le mapper en tire
  // `nombreChapitres` et n'expose JAMAIS le contenu dans la réponse de liste.
  contenuHtml: true,
} satisfies Prisma.FormationSelect;

const detailInclude = {
  categorie: { select: { id: true, nom: true } },
  filiere: { select: { id: true, nom: true } },
  quiz: { include: { questions: { orderBy: { ordre: "asc" } } } },
} satisfies Prisma.FormationInclude;

/**
 * Couverture d'une formation, pour la route de lecture publique.
 *
 * `publiee` accompagne le fichier : une couverture de brouillon ne doit pas
 * fuiter avant publication.
 */
export function findFormationCouverture(id: string) {
  return prisma.formation.findUnique({
    where: { id },
    select: {
      publiee: true,
      imageDocument: { select: { storedName: true, mimeType: true } },
    },
  });
}

export type FormationListItem = Prisma.FormationGetPayload<{ select: typeof listSelect }>;
export type FormationDetail = Prisma.FormationGetPayload<{ include: typeof detailInclude }>;

export function findFormationById(id: string): Promise<FormationDetail | null> {
  return prisma.formation.findUnique({ where: { id }, include: detailInclude });
}

export interface FormationFilters {
  q?: string;
  categorieId?: string;
  filiereId?: string;
  niveau?: string;
  certifiante?: boolean;
  populaire?: boolean;
  publiee?: boolean;
}

export function buildFormationWhere(filters: FormationFilters): Prisma.FormationWhereInput {
  const where: Prisma.FormationWhereInput = {};
  if (filters.publiee !== undefined) where.publiee = filters.publiee;
  // Filtre par identifiant : un renommage de catégorie ne casse ni un lien
  // partagé, ni un onglet mis en favori.
  if (filters.categorieId) where.categorieId = filters.categorieId;
  if (filters.filiereId) where.filiereId = filters.filiereId;
  if (filters.niveau) where.niveau = filters.niveau;
  if (filters.certifiante !== undefined) where.certifiante = filters.certifiante;
  if (filters.populaire !== undefined) where.populaire = filters.populaire;
  if (filters.q) {
    where.OR = [
      { titre: { contains: filters.q, mode: "insensitive" } },
      { sousTitre: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export function listFormations(
  where: Prisma.FormationWhereInput,
  skip: number,
  take: number,
): Promise<[FormationListItem[], number]> {
  return Promise.all([
    prisma.formation.findMany({
      where,
      select: listSelect,
      orderBy: [{ populaire: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.formation.count({ where }),
  ]);
}

export function createFormation(data: Prisma.FormationCreateInput): Promise<FormationDetail> {
  return prisma.formation.create({ data, include: detailInclude });
}

export function updateFormation(
  id: string,
  data: Prisma.FormationUpdateInput,
): Promise<FormationDetail> {
  return prisma.formation.update({ where: { id }, data, include: detailInclude });
}

export function deleteFormation(id: string) {
  return prisma.formation.delete({ where: { id } });
}

/** Remplace intégralement le quiz d'une formation (l'admin réédite en bloc). */
export async function replaceQuiz(
  formationId: string,
  quiz: {
    titre: string;
    description: string;
    scoreMinimum: number;
    questions: Array<{
      enonce: string;
      type: "qcm" | "choix_multiples" | "vrai_faux";
      options: string[];
      bonnesReponses: number[];
      explication: string;
      chapitre?: string;
    }>;
  } | null,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.formationQuiz.deleteMany({ where: { formationId } });
    if (!quiz) return;
    await tx.formationQuiz.create({
      data: {
        formationId,
        titre: quiz.titre,
        description: quiz.description,
        scoreMinimum: quiz.scoreMinimum,
        questions: {
          create: quiz.questions.map((question, index) => ({
            enonce: question.enonce,
            type: question.type,
            options: question.options,
            bonnesReponses: question.bonnesReponses,
            explication: question.explication,
            chapitre: question.chapitre ?? null,
            ordre: index,
          })),
        },
      },
    });
  });
}

// ── Progression ──────────────────────────────────────────────────────────────

export function findProgress(jeuneId: string, formationId: string) {
  return prisma.formationProgress.findUnique({
    where: { jeuneId_formationId: { jeuneId, formationId } },
  });
}

export function listProgressByJeune(jeuneId: string) {
  return prisma.formationProgress.findMany({ where: { jeuneId } });
}

export function upsertProgress(
  jeuneId: string,
  formationId: string,
  data: Prisma.FormationProgressUncheckedUpdateInput,
) {
  return prisma.formationProgress.upsert({
    where: { jeuneId_formationId: { jeuneId, formationId } },
    // Les identifiants sont posés APRÈS le spread : `data` ne doit jamais pouvoir
    // rattacher la progression à un autre jeune.
    create: { ...(data as Prisma.FormationProgressUncheckedCreateInput), jeuneId, formationId },
    update: data,
  });
}

export function countFormationsValidees(jeuneId: string) {
  return prisma.formationProgress.count({ where: { jeuneId, valide: true } });
}

// ── Avis ─────────────────────────────────────────────────────────────────────

const avisInclude = {
  jeune: { select: { id: true, prenom: true, nom: true, photo: true } },
} satisfies Prisma.AvisInclude;

export type AvisFull = Prisma.AvisGetPayload<{ include: typeof avisInclude }>;

export function listAvis(
  formationId: string,
  skip: number,
  take: number,
): Promise<[AvisFull[], number]> {
  return Promise.all([
    prisma.avis.findMany({
      where: { formationId },
      include: avisInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.avis.count({ where: { formationId } }),
  ]);
}

/**
 * Avis récents, toutes formations publiées confondues.
 *
 * Alimente la preuve sociale de la page d'accueil. Trois conditions, et elles
 * comptent toutes :
 *  • formation PUBLIÉE — un brouillon ne doit rien laisser filtrer ;
 *  • commentaire NON VIDE — une note seule ne témoigne de rien ;
 *  • assez long pour être lisible — « test » ou « ok » remplirait la vitrine
 *    de vide.
 */
export function listAvisRecents(take: number, longueurMinimale: number) {
  return prisma.avis.findMany({
    where: {
      formation: { publiee: true },
      // Prisma ne sait pas filtrer sur une LONGUEUR : on écarte ici le vide, et
      // le service coupe ensuite au seuil.
      commentaire: { not: "" },
    },
    include: { ...avisInclude, formation: { select: { id: true, titre: true } } },
    orderBy: { createdAt: "desc" },
    // Marge : le filtre de longueur se fait après, il faut de quoi puiser.
    take: take * 5,
  }).then((lignes) =>
    lignes.filter((a) => a.commentaire.trim().length >= longueurMinimale).slice(0, take),
  );
}

export function upsertAvis(
  formationId: string,
  jeuneId: string,
  data: { note: number; commentaire: string },
): Promise<AvisFull> {
  return prisma.avis.upsert({
    where: { formationId_jeuneId: { formationId, jeuneId } },
    create: { formationId, jeuneId, ...data },
    update: data,
    include: avisInclude,
  });
}

export function deleteAvis(id: string) {
  return prisma.avis.delete({ where: { id } });
}

export function findAvisById(id: string) {
  return prisma.avis.findUnique({
    where: { id },
    select: { id: true, jeuneId: true, formationId: true },
  });
}

/**
 * Bascule le vote « utile » d'un jeune sur un avis et resynchronise le compteur.
 *
 * Le compteur est recalculé depuis la table de jointure plutôt qu'incrémenté :
 * deux votes concurrents ne peuvent donc pas le désynchroniser.
 */
export async function toggleAvisUtile(avisId: string, jeuneId: string): Promise<AvisFull> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.avisUtile.findUnique({
      where: { avisId_jeuneId: { avisId, jeuneId } },
    });

    if (existing) {
      await tx.avisUtile.delete({ where: { avisId_jeuneId: { avisId, jeuneId } } });
    } else {
      await tx.avisUtile.create({ data: { avisId, jeuneId } });
    }

    const utile = await tx.avisUtile.count({ where: { avisId } });
    return tx.avis.update({ where: { id: avisId }, data: { utile }, include: avisInclude });
  });
}

/** Avis que le jeune a déjà marqués comme utiles, pour une formation donnée. */
export async function listAvisUtilesByJeune(
  formationId: string,
  jeuneId: string,
): Promise<string[]> {
  const votes = await prisma.avisUtile.findMany({
    where: { jeuneId, avis: { formationId } },
    select: { avisId: true },
  });
  return votes.map((vote) => vote.avisId);
}

/** Recalcule la note moyenne et le nombre d'avis après ajout ou suppression. */
export async function refreshFormationRating(formationId: string): Promise<void> {
  const aggregate = await prisma.avis.aggregate({
    where: { formationId },
    _avg: { note: true },
    _count: { _all: true },
  });
  await prisma.formation.update({
    where: { id: formationId },
    data: {
      note: aggregate._avg.note ? Math.round(aggregate._avg.note * 10) / 10 : null,
      nombreAvis: aggregate._count._all,
    },
  });
}

// ── Questions du quiz, une par une ───────────────────────────────────────────
//
// `replaceQuiz` réécrit tout en bloc (import, duplication). Ces opérations-ci
// servent l'édition au fil de l'eau depuis le back-office : ajouter une question
// ne doit pas réécrire les autres, ni faire perdre leur identifiant — les
// tentatives passées y font référence.

export function findQuizByFormation(formationId: string) {
  return prisma.formationQuiz.findUnique({
    where: { formationId },
    include: { questions: { orderBy: { ordre: "asc" } } },
  });
}

export function createQuiz(data: {
  formationId: string;
  titre: string;
  description: string;
  scoreMinimum: number;
}) {
  return prisma.formationQuiz.create({ data });
}

export function updateQuiz(
  formationId: string,
  data: Partial<{ titre: string; description: string; scoreMinimum: number }>,
) {
  return prisma.formationQuiz.update({ where: { formationId }, data });
}

export function findQuizQuestion(id: string) {
  return prisma.formationQuizQuestion.findUnique({ where: { id } });
}

export function createQuizQuestion(data: Prisma.FormationQuizQuestionUncheckedCreateInput) {
  return prisma.formationQuizQuestion.create({ data });
}

export function updateQuizQuestion(
  id: string,
  data: Prisma.FormationQuizQuestionUncheckedUpdateInput,
) {
  return prisma.formationQuizQuestion.update({ where: { id }, data });
}

export function deleteQuizQuestion(id: string) {
  return prisma.formationQuizQuestion.delete({ where: { id } });
}

export function countQuizQuestions(quizId: string) {
  return prisma.formationQuizQuestion.count({ where: { quizId } });
}

/** Les questions partent avec le quiz (`onDelete: Cascade`). */
export function deleteQuiz(formationId: string) {
  return prisma.formationQuiz.delete({ where: { formationId } });
}

/** Position suivante, pour qu'une nouvelle question arrive en fin de quiz. */
export async function nextQuestionOrdre(quizId: string): Promise<number> {
  const last = await prisma.formationQuizQuestion.findFirst({
    where: { quizId },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });
  return (last?.ordre ?? -1) + 1;
}
