import type { OffreStatus } from "@prisma/client";
import type { OffreFull } from "../repositories/offre.repository.js";

/** Miroir de l'interface `Offre` du frontend. */
export interface OffreDto {
  id: string;
  titre: string;
  entreprise: { id: string; nom: string; logo?: string; ville: string };
  type: string;
  ville: string;
  mode: string;
  niveauDemande: string;
  /** Libellé de la filière, pour l'AFFICHAGE seulement. */
  filiere: string;
  /** Référence stable au référentiel — obligatoire sur une offre. */
  filiereId: string;
  competences: string[];
  description: string;
  /** `YYYY-MM-DD`, comme attendu par le frontend. */
  dateLimite: string;
  nombrePostes: number;
  status: OffreStatus;
  candidatures: number;
  publieeLe: string;
}

function toDateOnly(date: Date | null): string {
  return date ? (date.toISOString().split("T")[0] ?? "") : "";
}

export function toOffreDto(offre: OffreFull): OffreDto {
  return {
    id: offre.id,
    titre: offre.titre,
    entreprise: {
      id: offre.entreprise.id,
      nom: offre.entreprise.nom,
      ...(offre.entreprise.logo ? { logo: offre.entreprise.logo } : {}),
      ville: offre.entreprise.ville,
    },
    type: offre.type,
    ville: offre.ville,
    mode: offre.mode,
    niveauDemande: offre.niveauDemande,
    filiere: offre.filiere.nom,
    filiereId: offre.filiereId,
    competences: offre.competences,
    description: offre.description,
    dateLimite: toDateOnly(offre.dateLimite),
    nombrePostes: offre.nombrePostes,
    status: offre.status,
    candidatures: offre._count.candidatures,
    publieeLe: toDateOnly(offre.publieeLe ?? offre.createdAt),
  };
}

/**
 * Vue publique : le nombre de candidatures est un signal concurrentiel que
 * l'entreprise n'a pas forcément envie d'exposer, on le laisse à 0 côté public.
 */
export function toOffrePublicDto(offre: OffreFull): OffreDto {
  return { ...toOffreDto(offre), candidatures: 0 };
}
