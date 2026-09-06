import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/**
 * Entretiens occupant un créneau sur une plage de dates.
 *
 * `refuse` et `annule` sont exclus : un refus rend le créneau à nouveau
 * disponible, sans quoi une entreprise verrait son calendrier se boucher au fil
 * des demandes déclinées.
 */
export function listCreneauxOccupes(entrepriseId: string, jusquA: Date) {
  return prisma.entretien.findMany({
    where: {
      entrepriseId,
      date: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: jusquA },
      status: { in: ["en_attente", "accepte"] },
    },
    select: { date: true, heure: true },
  });
}

/** Une demande en attente par jeune et par entreprise — voir le service. */
export function findDemandeSpontaneeEnCours(entrepriseId: string, jeuneId: string) {
  return prisma.entretien.findFirst({
    where: { entrepriseId, jeuneId, spontanee: true, status: "en_attente" },
    select: { id: true, date: true, heure: true },
  });
}

/** Minuit UTC du jour : une date programmée passée ne se réserve plus. */
function debutDuJour(): Date {
  const jour = new Date();
  jour.setUTCHours(0, 0, 0, 0);
  return jour;
}

/**
 * Condition d'apparition dans la liste des candidatures spontanées.
 *
 * Extraite pour que la RECHERCHE GLOBALE applique exactement la même règle :
 * une entreprise trouvable mais absente de la liste mènerait à un écran vide.
 */
function entrepriseOuverteWhere(aujourdhui: Date): Prisma.EntrepriseWhereInput {
  return {
    spontaneeOuverte: true,
    // Une entreprise non validée par OMB ne reçoit pas de candidats (§7.2).
    status: "valide",
    /*
     * Sans journée programmée À VENIR, la fiche ne proposerait aucun créneau.
     * Le filtre porte sur `gte: aujourd'hui` et non sur `some: {}` : une
     * entreprise dont toutes les dates sont passées serait sinon listée avec un
     * calendrier vide.
     */
    disponibilites: { some: { date: { gte: aujourdhui } } },
  };
}

/**
 * Les mêmes, restreintes à une liste d'identifiants — pour la recherche globale.
 *
 * L'appariement du texte est fait ailleurs (`recherche.repository`), qui seul
 * sait ignorer les accents ; ici on n'ajoute que la règle de visibilité, pour
 * qu'elle reste écrite à un seul endroit.
 */
export function listerEntreprisesOuvertesParId(ids: string[], take: number) {
  const where: Prisma.EntrepriseWhereInput = {
    ...entrepriseOuverteWhere(debutDuJour()),
    id: { in: ids },
  };

  return Promise.all([
    prisma.entreprise.findMany({
      where,
      orderBy: { nom: "asc" },
      take,
      select: { id: true, nom: true, secteur: true, ville: true, logo: true },
    }),
    prisma.entreprise.count({ where }),
  ]);
}

/**
 * Entreprises ouvertes aux candidatures spontanées, paginées.
 *
 * @param ids restreint la liste, quand une recherche a déjà désigné les
 * correspondances. `undefined` = aucune restriction.
 */
export function listEntreprisesOuvertes(skip: number, take: number, ids?: string[]) {
  const aujourdhui = debutDuJour();
  const where: Prisma.EntrepriseWhereInput = {
    ...entrepriseOuverteWhere(aujourdhui),
    ...(ids ? { id: { in: ids } } : {}),
  };

  return Promise.all([
    prisma.entreprise.findMany({
      where,
      orderBy: { nom: "asc" },
      skip,
      take,
      include: {
        disponibilites: { where: { date: { gte: aujourdhui } }, orderBy: { date: "asc" } },
      },
    }),
    prisma.entreprise.count({ where }),
  ]);
}

export function findEntrepriseOuverte(entrepriseId: string) {
  return prisma.entreprise.findFirst({
    where: { id: entrepriseId, spontaneeOuverte: true, status: "valide" },
    include: {
      // Le passé n'a plus d'effet sur les créneaux proposés au candidat.
      disponibilites: { where: { date: { gte: debutDuJour() } }, orderBy: { date: "asc" } },
    },
  });
}

/* ── Journées programmées ────────────────────────────────────────────────── */

/** Journées programmées à partir de `depuis` ; le passé n'a plus d'effet. */
export function listDates(entrepriseId: string, depuis: Date) {
  return prisma.disponibiliteDate.findMany({
    where: { entrepriseId, date: { gte: depuis } },
    orderBy: [{ date: "asc" }, { debut: "asc" }],
  });
}

/**
 * Remplace les journées programmées À VENIR, d'un seul tenant.
 *
 * Suppression puis réinsertion dans une transaction : c'est un CALENDRIER, pas
 * une collection de lignes indépendantes. Un différentiel ligne à ligne
 * laisserait, en cas d'échec au milieu, un mélange d'ancien et de nouveau —
 * soit des heures d'ouverture que l'entreprise n'a jamais choisies.
 *
 * Les dates passées sont préservées : elles ne sont jamais envoyées par le
 * client, les supprimer effacerait un historique que personne n'a demandé à
 * effacer.
 */
export function replaceDates(
  entrepriseId: string,
  depuis: Date,
  dates: Array<{ date: Date; debut: string; fin: string }>,
) {
  return prisma.$transaction([
    prisma.disponibiliteDate.deleteMany({ where: { entrepriseId, date: { gte: depuis } } }),
    prisma.disponibiliteDate.createMany({
      data: dates.map((entree) => ({ ...entree, entrepriseId })),
    }),
  ]);
}
