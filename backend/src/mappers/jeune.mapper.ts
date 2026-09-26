import type { JeuneStatus } from "@prisma/client";
import type { JeuneFull } from "../repositories/jeune.repository.js";
import { env } from "../config/env.js";
import { referenceCertificat } from "../domain/certificat.js";
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

/**
 * Formation suivie sur la plateforme, telle qu'un recruteur la lit.
 *
 * Le profil n'exposait que des identifiants (`formationsValidees`) et un
 * compte : la fiche talent affichait « 3 formation(s) validée(s) » sans jamais
 * dire lesquelles — l'information la plus utile au recruteur, et la seule que
 * la plateforme certifie elle-même.
 */
export interface FormationSuivieDto {
  /** Identifiant de la FORMATION, pas de la progression. */
  id: string;
  titre: string;
  categorie: string;
  niveau?: string;
  /** La formation délivre un certificat à qui réussit son quiz. */
  certifiante: boolean;
  tempsLectureMin: number;
  /** Avancement de lecture, 0–100. */
  progression: number;
  /** Cours lu jusqu'au bout. */
  lu: boolean;
  /** Quiz réussi — c'est ce qui fait la formation « validée ». */
  valide: boolean;
  /** Meilleur score au quiz, en %. */
  meilleurScore?: number;
  /** ISO — date de réussite du quiz. */
  valideAt?: string;
  /**
   * Référence du certificat, `O2W-CERT-2026-00042`.
   *
   * Présente uniquement si le jeune a consulté son certificat au moins une
   * fois : le numéro est tiré de la séquence à ce moment-là. Le PDF, lui,
   * reste derrière le jeton du candidat — seule la référence est publiée.
   */
  certificat?: string;
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
  /**
   * Parcours de formation détaillé, validées d'abord.
   *
   * Double emploi assumé avec `formationsLues` / `formationsValidees` /
   * `scoresFormations` : ces trois-là sont des index par identifiant, consommés
   * par le calcul de score et les écrans du jeune ; celui-ci est une LISTE
   * lisible, pour l'affichage.
   */
  formations: FormationSuivieDto[];
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

/**
 * Parcours de formation, ordonné par ce qui compte pour un lecteur.
 *
 * Les formations VALIDÉES d'abord, de la plus récente à la plus ancienne —
 * c'est l'acquis, et le dernier acquis est le plus parlant. Viennent ensuite
 * les cours seulement lus ou en cours, par avancement décroissant. Une
 * progression à 0, ni lue ni validée, n'est pas un parcours : elle est écartée,
 * sans quoi la moindre formation ouverte une fois viendrait gonfler la liste.
 */
function toFormationsSuivies(jeune: JeuneFull): FormationSuivieDto[] {
  return jeune.progressions
    .filter((progression) => progression.valide || progression.lu || progression.progression > 0)
    .map((progression) => ({
      id: progression.formationId,
      titre: progression.formation.titre,
      categorie: progression.formation.categorie.nom,
      ...(progression.formation.niveau ? { niveau: progression.formation.niveau } : {}),
      certifiante: progression.formation.certifiante,
      tempsLectureMin: progression.formation.tempsLectureMin,
      progression: progression.progression,
      lu: progression.lu,
      valide: progression.valide,
      ...(progression.meilleurScore !== null ? { meilleurScore: progression.meilleurScore } : {}),
      ...(progression.valideAt ? { valideAt: progression.valideAt.toISOString() } : {}),
      // Le numéro n'existe qu'une fois le certificat consulté : une formation
      // validée sans numéro est normale, et la fiche ne montre alors rien.
      ...(progression.certificatNumero !== null && progression.valideAt
        ? {
            certificat: referenceCertificat(
              progression.certificatNumero,
              progression.valideAt,
              env.APP_TIMEZONE,
            ),
          }
        : {}),
    }))
    .sort((a, b) => {
      if (a.valide !== b.valide) return a.valide ? -1 : 1;
      if (a.valide && b.valide) return (b.valideAt ?? "").localeCompare(a.valideAt ?? "");
      return b.progression - a.progression;
    });
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
    formations: toFormationsSuivies(jeune),
    candidatures,
    score,
  };
}

export function toJeunePublicDto(jeune: JeuneFull): JeunePublicDto {
  const { email: _email, telephone: _telephone, liens: _liens, ...rest } = toJeuneDto(jeune);
  return rest;
}
