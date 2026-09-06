import { type Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const fullInclude = {
  offre: {
    select: {
      id: true,
      titre: true,
      type: true,
      ville: true,
      mode: true,
      dateLimite: true,
      status: true,
      entrepriseId: true,
      entreprise: { select: { id: true, nom: true, logo: true, ville: true } },
    },
  },
  jeune: {
    select: {
      id: true,
      prenom: true,
      nom: true,
      photo: true,
      titre: true,
      ville: true,
      filiere: { select: { nom: true } },
      niveauEtudes: true,
      competences: true,
      scoreQuiz: true,
      /*
       * Signaux de QUALIFICATION, ceux que le recruteur regarde en premier.
       *
       * Deux chiffres, deux sens : `_count` donne le total de formations
       * entamées, la relation filtrée ne remonte que les VALIDÉES — celles qui
       * ont donné un certificat. Un candidat à « 2 validées sur 9 suivies » ne
       * se lit pas comme un candidat à « 2 sur 2 ».
       *
       * Seules les lignes validées sont chargées (quelques-unes) ; le total
       * passe par un décompte, sans rapatrier le reste.
       */
      progressions: { where: { valide: true }, select: { id: true } },
      _count: { select: { progressions: true } },
    },
  },
  cv: { select: { id: true, filename: true, mimeType: true, size: true } },
} satisfies Prisma.CandidatureInclude;

export type CandidatureFull = Prisma.CandidatureGetPayload<{ include: typeof fullInclude }>;

export function findCandidatureById(id: string): Promise<CandidatureFull | null> {
  return prisma.candidature.findUnique({ where: { id }, include: fullInclude });
}

export function findExistingCandidature(jeuneId: string, offreId: string) {
  return prisma.candidature.findUnique({
    where: { jeuneId_offreId: { jeuneId, offreId } },
    select: { id: true, status: true },
  });
}

export function createCandidature(
  data: Prisma.CandidatureUncheckedCreateInput,
): Promise<CandidatureFull> {
  return prisma.candidature.create({ data, include: fullInclude });
}

export function updateCandidature(
  id: string,
  data: Prisma.CandidatureUpdateInput,
): Promise<CandidatureFull> {
  return prisma.candidature.update({ where: { id }, data, include: fullInclude });
}

/**
 * Critères de tri d'une liste de candidatures.
 *
 * `score` et `formations` servent au recruteur à faire remonter les profils les
 * plus qualifiés sans parcourir toutes les pages.
 */
export type CandidatureSort = "recent" | "score" | "formations";

/**
 * Traduction d'un tri en `orderBy` Prisma.
 *
 * `createdAt` est TOUJOURS le critère de repli : sans lui, deux candidats à
 * score égal changeraient d'ordre d'une page à l'autre, et le même profil
 * apparaîtrait deux fois — ou pas du tout.
 *
 * Contrainte à connaître : Prisma sait ordonner sur un décompte de relation,
 * mais pas sur un décompte FILTRÉ. « formations » trie donc sur le total
 * entamé, qui est affiché à côté du nombre de validées — l'ordre correspond
 * bien à un chiffre visible.
 */
function buildOrderBy(sort: CandidatureSort): Prisma.CandidatureOrderByWithRelationInput[] {
  switch (sort) {
    case "score":
      // `nulls: "last"` : un profil sans test ne doit pas coiffer la liste.
      return [{ jeune: { scoreQuiz: { sort: "desc", nulls: "last" } } }, { createdAt: "desc" }];
    case "formations":
      return [{ jeune: { progressions: { _count: "desc" } } }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export function listCandidatures(
  where: Prisma.CandidatureWhereInput,
  skip: number,
  take: number,
  sort: CandidatureSort = "recent",
): Promise<[CandidatureFull[], number]> {
  return Promise.all([
    prisma.candidature.findMany({
      where,
      include: fullInclude,
      orderBy: buildOrderBy(sort),
      skip,
      take,
    }),
    prisma.candidature.count({ where }),
  ]);
}

/**
 * Répartition par statut sur un périmètre donné.
 *
 * Un `groupBy` plutôt qu'un comptage par statut : une seule requête, et les
 * compteurs restent justes même quand la liste est paginée — c'est justement ce
 * qui permet de ne plus charger toute la collection côté navigateur.
 */
export async function countCandidaturesByStatus(
  where: Prisma.CandidatureWhereInput,
): Promise<Record<string, number>> {
  const rows = await prisma.candidature.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
}

export function countCandidaturesByJeune(jeuneId: string) {
  return prisma.candidature.count({
    where: { jeuneId, status: { not: "retiree" } },
  });
}
