import type { JeuneStatus } from "@prisma/client";
import type { JeuneFull } from "../repositories/jeune.repository.js";
import { computeProfilCompletion, computeScoreJeune } from "../domain/profil.js";

export interface ExperienceDto {
  id: string;
  titre: string;
  structure: string;
  periode: string;
  type: string;
  description: string;
  competences: string[];
}

export interface LienDto {
  id: string;
  type: string;
  url: string;
}

/** Miroir de l'interface `Jeune` du frontend (src/lib/types.ts). */
export interface JeuneDto {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  photo?: string;
  banniere?: string;
  bio?: string;
  titre: string;
  niveauEtudes: string;
  etablissement: string;
  /** Libellé de la filière, pour l'AFFICHAGE seulement. */
  filiere: string;
  /** Référence stable au référentiel ; `null` si non renseignée. */
  filiereId: string | null;
  specialite?: string;
  anneeEtude?: string;
  diplome?: string;
  experiences: ExperienceDto[];
  competences: string[];
  langues: string[];
  liens: LienDto[];
  scoreQuiz?: number;
  status: JeuneStatus;
  profilCompletion: number;
  formationsLues: string[];
  formationsValidees: string[];
  scoresFormations: Record<string, number>;
  formationsCompletees: number;
  candidatures: number;
  /** Score d'employabilité dérivé (0–100). */
  score: number;
}

/**
 * Vue publique, destinée aux recruteurs : ni email, ni téléphone, ni liens.
 * Les coordonnées ne sont divulguées qu'au travers d'une candidature ou d'un
 * entretien, c'est-à-dire quand le jeune a lui-même initié le contact.
 */
export type JeunePublicDto = Omit<JeuneDto, "email" | "telephone" | "liens">;

function completionInput(jeune: JeuneFull) {
  return {
    prenom: jeune.prenom,
    nom: jeune.nom,
    telephone: jeune.telephone,
    ville: jeune.ville,
    titre: jeune.titre,
    niveauEtudes: jeune.niveauEtudes,
    etablissement: jeune.etablissement,
    filiereId: jeune.filiereId,
    bio: jeune.bio,
    photo: jeune.photo,
    competences: jeune.competences,
    langues: jeune.langues,
    experiencesCount: jeune.experiences.length,
    liensCount: jeune.liens.length,
  };
}

export function toJeuneDto(jeune: JeuneFull): JeuneDto {
  const formationsLues = jeune.progressions.filter((p) => p.lu).map((p) => p.formationId);
  const formationsValidees = jeune.progressions.filter((p) => p.valide).map((p) => p.formationId);

  const scoresFormations: Record<string, number> = {};
  for (const progression of jeune.progressions) {
    if (progression.meilleurScore !== null) {
      scoresFormations[progression.formationId] = progression.meilleurScore;
    }
  }

  const profilCompletion = computeProfilCompletion(completionInput(jeune));
  const candidatures = jeune._count.candidatures;

  const { score } = computeScoreJeune({
    profilCompletion,
    scoreQuiz: jeune.scoreQuiz,
    formationsValidees: formationsValidees.length,
    formationsLuesSeules: formationsLues.filter((id) => !formationsValidees.includes(id)).length,
    candidatures,
  });

  return {
    id: jeune.id,
    prenom: jeune.prenom,
    nom: jeune.nom,
    email: jeune.user.email,
    telephone: jeune.telephone,
    ville: jeune.ville,
    ...(jeune.photo ? { photo: jeune.photo } : {}),
    ...(jeune.banniere ? { banniere: jeune.banniere } : {}),
    ...(jeune.bio ? { bio: jeune.bio } : {}),
    titre: jeune.titre,
    niveauEtudes: jeune.niveauEtudes,
    etablissement: jeune.etablissement,
    filiere: jeune.filiere?.nom ?? "",
    filiereId: jeune.filiereId,
    ...(jeune.specialite ? { specialite: jeune.specialite } : {}),
    ...(jeune.anneeEtude ? { anneeEtude: jeune.anneeEtude } : {}),
    ...(jeune.diplome ? { diplome: jeune.diplome } : {}),
    experiences: jeune.experiences.map((experience) => ({
      id: experience.id,
      titre: experience.titre,
      structure: experience.structure,
      periode: experience.periode,
      type: experience.type,
      description: experience.description,
      competences: experience.competences,
    })),
    competences: jeune.competences,
    langues: jeune.langues,
    liens: jeune.liens.map((lien) => ({ id: lien.id, type: lien.type, url: lien.url })),
    ...(jeune.scoreQuiz !== null ? { scoreQuiz: jeune.scoreQuiz } : {}),
    status: jeune.status,
    profilCompletion,
    formationsLues,
    formationsValidees,
    scoresFormations,
    formationsCompletees: formationsValidees.length,
    candidatures,
    score,
  };
}

export function toJeunePublicDto(jeune: JeuneFull): JeunePublicDto {
  const { email: _email, telephone: _telephone, liens: _liens, ...rest } = toJeuneDto(jeune);
  return rest;
}
