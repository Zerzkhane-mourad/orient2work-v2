/**
 * Complétion du profil et score d'employabilité.
 *
 * Ces deux valeurs sont TOUJOURS dérivées, jamais stockées : le client ne peut
 * donc pas les gonfler en modifiant son profil via l'API.
 */
import { CANDIDATURES_OBJECTIF, FORMATIONS_OBJECTIF, SCORE_WEIGHTS } from "./enums.js";

export interface ProfilCompletionInput {
  prenom: string;
  nom: string;
  telephone: string;
  ville: string;
  titre: string;
  niveauEtudes: string;
  etablissement: string;
  /** Rattachement au référentiel : seule sa PRÉSENCE compte pour la complétion. */
  filiereId: string | null;
  bio?: string | null;
  photo?: string | null;
  competences: string[];
  langues: string[];
  experiencesCount: number;
  liensCount: number;
}

/** Champs pris en compte, chacun avec son poids relatif. */
const COMPLETION_CHECKS: ReadonlyArray<{
  weight: number;
  filled: (p: ProfilCompletionInput) => boolean;
}> = [
  { weight: 1, filled: (p) => p.prenom.trim().length > 0 },
  { weight: 1, filled: (p) => p.nom.trim().length > 0 },
  { weight: 1, filled: (p) => p.telephone.trim().length > 0 },
  { weight: 1, filled: (p) => p.ville.trim().length > 0 },
  { weight: 1, filled: (p) => p.titre.trim().length > 0 },
  { weight: 1, filled: (p) => p.niveauEtudes.trim().length > 0 },
  { weight: 1, filled: (p) => p.etablissement.trim().length > 0 },
  { weight: 1, filled: (p) => Boolean(p.filiereId) },
  { weight: 1, filled: (p) => Boolean(p.bio && p.bio.trim().length >= 30) },
  { weight: 1, filled: (p) => Boolean(p.photo) },
  { weight: 2, filled: (p) => p.competences.length >= 3 },
  { weight: 1, filled: (p) => p.langues.length >= 1 },
  { weight: 2, filled: (p) => p.experiencesCount >= 1 },
  { weight: 1, filled: (p) => p.liensCount >= 1 },
];

const COMPLETION_TOTAL = COMPLETION_CHECKS.reduce((sum, check) => sum + check.weight, 0);

export function computeProfilCompletion(profil: ProfilCompletionInput): number {
  const acquis = COMPLETION_CHECKS.reduce(
    (sum, check) => sum + (check.filled(profil) ? check.weight : 0),
    0,
  );
  return Math.round((acquis / COMPLETION_TOTAL) * 100);
}

export interface ScoreInput {
  profilCompletion: number;
  scoreQuiz: number | null;
  /** Formations dont le quiz est réussi. */
  formationsValidees: number;
  /** Formations lues mais dont le quiz n'est pas encore réussi. */
  formationsLuesSeules: number;
  candidatures: number;
}

export interface ScoreDetail {
  score: number;
  parts: Array<{ key: keyof typeof SCORE_WEIGHTS; points: number; max: number }>;
}

/**
 * Une formation validée vaut 1 crédit, un cours lu sans quiz réussi vaut 0,5 —
 * même règle que `formationsCredits` côté frontend.
 */
export function computeScoreJeune(input: ScoreInput): ScoreDetail {
  const credits = input.formationsValidees + input.formationsLuesSeules * 0.5;

  const parts = [
    {
      key: "profil" as const,
      points: Math.round((input.profilCompletion / 100) * SCORE_WEIGHTS.profil),
      max: SCORE_WEIGHTS.profil,
    },
    {
      key: "test" as const,
      points: Math.round(((input.scoreQuiz ?? 0) / 100) * SCORE_WEIGHTS.test),
      max: SCORE_WEIGHTS.test,
    },
    {
      key: "formations" as const,
      points: Math.round(Math.min(1, credits / FORMATIONS_OBJECTIF) * SCORE_WEIGHTS.formations),
      max: SCORE_WEIGHTS.formations,
    },
    {
      key: "candidatures" as const,
      points: Math.round(
        Math.min(1, input.candidatures / CANDIDATURES_OBJECTIF) * SCORE_WEIGHTS.candidatures,
      ),
      max: SCORE_WEIGHTS.candidatures,
    },
  ];

  const total = parts.reduce((sum, part) => sum + part.points, 0);
  return { score: Math.max(0, Math.min(100, total)), parts };
}
