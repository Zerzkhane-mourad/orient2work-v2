import type { CandidatureStatus } from "@prisma/client";
import type { CandidatureFull } from "../repositories/candidature.repository.js";

export interface CandidatureDto {
  id: string;
  status: CandidatureStatus;
  message?: string;
  createdAt: string;
  vueLe?: string;
  offre: {
    id: string;
    titre: string;
    type: string;
    ville: string;
    mode: string;
    dateLimite: string;
    entreprise: { id: string; nom: string; logo?: string; ville: string };
  };
  cv?: { id: string; filename: string; size: number };
}

/** Vue recruteur : ajoute le candidat, retire les informations redondantes sur l'offre. */
export interface CandidatureRecruteurDto extends CandidatureDto {
  jeune: {
    id: string;
    prenom: string;
    nom: string;
    photo?: string;
    titre: string;
    ville: string;
    filiere: string;
    niveauEtudes: string;
    competences: string[];
    scoreQuiz?: number;
    /**
     * Formations menées jusqu'au certificat.
     *
     * Distinct de `formationsSuivies` : entamer un cours n'est pas le terminer,
     * et c'est la différence entre les deux qui renseigne le recruteur.
     */
    formationsValidees: number;
    formationsSuivies: number;
  };
}

function toDateOnly(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

export function toCandidatureDto(candidature: CandidatureFull): CandidatureDto {
  return {
    id: candidature.id,
    status: candidature.status,
    ...(candidature.message ? { message: candidature.message } : {}),
    createdAt: candidature.createdAt.toISOString(),
    ...(candidature.vueLe ? { vueLe: candidature.vueLe.toISOString() } : {}),
    offre: {
      id: candidature.offre.id,
      titre: candidature.offre.titre,
      type: candidature.offre.type,
      ville: candidature.offre.ville,
      mode: candidature.offre.mode,
      dateLimite: toDateOnly(candidature.offre.dateLimite),
      entreprise: {
        id: candidature.offre.entreprise.id,
        nom: candidature.offre.entreprise.nom,
        ...(candidature.offre.entreprise.logo ? { logo: candidature.offre.entreprise.logo } : {}),
        ville: candidature.offre.entreprise.ville,
      },
    },
    ...(candidature.cv
      ? {
          cv: {
            id: candidature.cv.id,
            filename: candidature.cv.filename,
            size: candidature.cv.size,
          },
        }
      : {}),
  };
}

export function toCandidatureRecruteurDto(candidature: CandidatureFull): CandidatureRecruteurDto {
  return {
    ...toCandidatureDto(candidature),
    jeune: {
      id: candidature.jeune.id,
      prenom: candidature.jeune.prenom,
      nom: candidature.jeune.nom,
      ...(candidature.jeune.photo ? { photo: candidature.jeune.photo } : {}),
      titre: candidature.jeune.titre,
      ville: candidature.jeune.ville,
      filiere: candidature.jeune.filiere?.nom ?? "",
      niveauEtudes: candidature.jeune.niveauEtudes,
      competences: candidature.jeune.competences,
      ...(candidature.jeune.scoreQuiz !== null ? { scoreQuiz: candidature.jeune.scoreQuiz } : {}),
      // Seules les progressions VALIDÉES sont chargées : leur nombre est la
      // longueur du tableau, et le total vient du décompte.
      formationsValidees: candidature.jeune.progressions.length,
      formationsSuivies: candidature.jeune._count.progressions,
    },
  };
}
