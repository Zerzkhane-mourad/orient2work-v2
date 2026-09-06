import type { EntretienStatus } from "@prisma/client";
import type { EntretienFull } from "../repositories/entretien.repository.js";

/** Miroir de l'interface `Entretien` du frontend. */
export interface EntretienDto {
  id: string;
  jeune: { id: string; prenom: string; nom: string; photo?: string; titre: string };
  entreprise: { id: string; nom: string; logo?: string };
  offreTitre: string;
  /** `YYYY-MM-DD`. */
  date: string;
  heure: string;
  status: EntretienStatus;
  lienReunion?: string;
  commentaire?: string;
  /**
   * Demande née d'une candidature spontanée : c'est le JEUNE qui a réservé.
   * Détermine qui doit répondre — voir `respond`.
   */
  spontanee: boolean;
}

export function toEntretienDto(entretien: EntretienFull): EntretienDto {
  return {
    id: entretien.id,
    jeune: {
      id: entretien.jeune.id,
      prenom: entretien.jeune.prenom,
      nom: entretien.jeune.nom,
      ...(entretien.jeune.photo ? { photo: entretien.jeune.photo } : {}),
      titre: entretien.jeune.titre,
    },
    entreprise: {
      id: entretien.entreprise.id,
      nom: entretien.entreprise.nom,
      ...(entretien.entreprise.logo ? { logo: entretien.entreprise.logo } : {}),
    },
    offreTitre: entretien.offreTitre,
    date: entretien.date.toISOString().split("T")[0] ?? "",
    heure: entretien.heure,
    status: entretien.status,
    spontanee: entretien.spontanee,
    // Le lien de visio n'a de sens qu'une fois l'entretien accepté ; le diffuser
    // avant reviendrait à donner accès à une salle de réunion non confirmée.
    ...(entretien.lienReunion && entretien.status === "accepte"
      ? { lienReunion: entretien.lienReunion }
      : {}),
    ...(entretien.commentaire ? { commentaire: entretien.commentaire } : {}),
  };
}
