/** Agrégats du tableau de bord admin (§7.6). */
import { prisma } from "../lib/prisma.js";

export interface AdminStats {
  jeunesInscrits: number;
  jeunesValides: number;
  entreprisesInscrites: number;
  entreprisesValidees: number;
  offresPubliees: number;
  offresEnAttente: number;
  candidatures: number;
  entretiensDemandes: number;
  entretiensAcceptes: number;
  formationsPubliees: number;
  tauxValidationQuiz: number;
}

export async function computeAdminStats(): Promise<AdminStats> {
  const [
    jeunesInscrits,
    jeunesValides,
    entreprisesInscrites,
    entreprisesValidees,
    offresPubliees,
    offresEnAttente,
    candidatures,
    entretiensDemandes,
    entretiensAcceptes,
    formationsPubliees,
    tentatives,
    tentativesReussies,
  ] = await prisma.$transaction([
    prisma.jeune.count(),
    prisma.jeune.count({ where: { status: "valide" } }),
    prisma.entreprise.count(),
    prisma.entreprise.count({ where: { status: "valide" } }),
    prisma.offre.count({ where: { status: "publiee" } }),
    prisma.offre.count({ where: { status: "attente_validation" } }),
    prisma.candidature.count({ where: { status: { not: "retiree" } } }),
    prisma.entretien.count(),
    prisma.entretien.count({ where: { status: "accepte" } }),
    prisma.formation.count({ where: { publiee: true } }),
    prisma.quizAttempt.count(),
    prisma.quizAttempt.count({ where: { reussi: true } }),
  ]);

  return {
    jeunesInscrits,
    jeunesValides,
    entreprisesInscrites,
    entreprisesValidees,
    offresPubliees,
    offresEnAttente,
    candidatures,
    entretiensDemandes,
    entretiensAcceptes,
    formationsPubliees,
    tauxValidationQuiz: tentatives === 0 ? 0 : Math.round((tentativesReussies / tentatives) * 100),
  };
}
