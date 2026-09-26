import type { CandidatureStatus, EntretienStatus } from "@prisma/client";
import type { CandidatureFull } from "../repositories/candidature.repository.js";

export interface CandidatureDto {
  id: string;
  status: CandidatureStatus;
  message?: string;
  createdAt: string;
  vueLe?: string;
  /**
   * Statut du dernier entretien proposé sur cette candidature, s'il y en a un.
   *
   * Distinct du statut `entretien` de la candidature, qui reste le même avant
   * et après la réponse : c'est ce champ qui dit si une réponse est encore
   * attendue (`en_attente`), donnée (`accepte`, `refuse`) ou devenue sans objet
   * (`annule`).
   */
  entretienStatus?: EntretienStatus;
  offre: {
    id: string;
    titre: string;
    type: string;
    ville: string;
    mode: string;
    niveauDemande: string;
    filiere: string;
    competences: string[];
    /**
     * Début de la description, et non la description entière : la liste de
     * suivi n'en montre que trois lignes, et une page de dix candidatures
     * transporterait sinon dix annonces complètes.
     */
    apercu: string;
    nombrePostes: number;
    dateLimite: string;
    entreprise: { id: string; nom: string; logo?: string; ville: string };
  };
  cv?: { id: string; filename: string; size: number };
}

/** Longueur de l'aperçu — de quoi remplir trois lignes, au-delà de la troncature CSS. */
const APERCU_MAX = 280;

function apercu(description: string): string {
  const texte = description.replace(/\s+/g, " ").trim();
  return texte.length > APERCU_MAX ? `${texte.slice(0, APERCU_MAX).trimEnd()}…` : texte;
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
    ...(candidature.entretiens[0] ? { entretienStatus: candidature.entretiens[0].status } : {}),
    offre: {
      id: candidature.offre.id,
      titre: candidature.offre.titre,
      type: candidature.offre.type,
      ville: candidature.offre.ville,
      mode: candidature.offre.mode,
      niveauDemande: candidature.offre.niveauDemande,
      filiere: candidature.offre.filiere.nom,
      competences: candidature.offre.competences,
      apercu: apercu(candidature.offre.description),
      nombrePostes: candidature.offre.nombrePostes,
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
