import type { IconName } from "@/components/ui/icon";
import type { Jeune } from "./types";

/**
 * Score d'employabilité du jeune (0–100).
 *
 * Quatre leviers, tous sous le contrôle du jeune. Les formations pèsent le plus
 * lourd : suivre le catalogue est le moyen le plus rapide de faire monter son
 * score, ce qui est exactement le comportement que la plateforme veut encourager.
 * Le score est toujours dérivé du profil (jamais stocké tel quel), comme
 * `computeProfilCompletion`.
 */
export const SCORE_WEIGHTS = {
  profil: 30,
  test: 20,
  formations: 40,
  candidatures: 10,
} as const;

/** Nombre de formations validées qui donne la totalité des points « formations ». */
export const FORMATIONS_OBJECTIF = 5;
/** Nombre de candidatures qui donne la totalité des points « candidatures ». */
export const CANDIDATURES_OBJECTIF = 5;

/** Points gagnés en réussissant le quiz d'une formation. */
export const POINTS_FORMATION_VALIDEE = SCORE_WEIGHTS.formations / FORMATIONS_OBJECTIF; // 8
/** Points gagnés en terminant la lecture d'un cours (la moitié d'une validation). */
export const POINTS_FORMATION_LUE = POINTS_FORMATION_VALIDEE / 2; // 4

export type ScoreKey = keyof typeof SCORE_WEIGHTS;

export interface ScorePart {
  key: ScoreKey;
  label: string;
  /** Points acquis (arrondis). */
  points: number;
  max: number;
  /** Détail chiffré affiché sous le libellé. */
  hint: string;
  /** Ce qu'il reste à faire pour gagner les points manquants. */
  action: string;
  href: string;
  icon: IconName;
}

/**
 * « Crédits formation » du jeune : une formation validée vaut 1, un cours lu
 * mais dont le quiz n'est pas encore réussi vaut 0,5.
 */
export function formationsCredits(jeune: Jeune): number {
  const validees = jeune.formationsValidees ?? [];
  const luesSeules = (jeune.formationsLues ?? []).filter((id) => !validees.includes(id));
  return validees.length + luesSeules.length * 0.5;
}

/** Détail du score, levier par levier. */
export function scoreParts(jeune: Jeune): ScorePart[] {
  const test = jeune.scoreQuiz ?? 0;
  const credits = formationsCredits(jeune);
  const validees = jeune.formationsValidees?.length ?? 0;
  const enCours = credits - validees; // 0,5 par cours lu non validé

  return [
    {
      key: "profil",
      label: "Profil complété",
      points: Math.round((jeune.profilCompletion / 100) * SCORE_WEIGHTS.profil),
      max: SCORE_WEIGHTS.profil,
      hint: `${jeune.profilCompletion}% du profil rempli`,
      action: "Compléter mon profil",
      href: "/espace-jeune/profil",
      icon: "person",
    },
    {
      key: "test",
      label: "Test de validation",
      points: Math.round((test / 100) * SCORE_WEIGHTS.test),
      max: SCORE_WEIGHTS.test,
      hint: test > 0 ? `${test}% au test` : "Test pas encore passé",
      action: "Passer le test",
      href: "/espace-jeune/test",
      icon: "fact_check",
    },
    {
      key: "formations",
      label: "Formations suivies",
      points: Math.round(Math.min(1, credits / FORMATIONS_OBJECTIF) * SCORE_WEIGHTS.formations),
      max: SCORE_WEIGHTS.formations,
      hint:
        `${validees}/${FORMATIONS_OBJECTIF} formation${validees > 1 ? "s" : ""} validée${validees > 1 ? "s" : ""}` +
        (enCours > 0 ? ` · ${enCours * 2} en cours` : ""),
      action: "Suivre une formation",
      href: "/espace-jeune/formations",
      icon: "school",
    },
    {
      key: "candidatures",
      label: "Candidatures envoyées",
      points: Math.round(
        Math.min(1, jeune.candidatures / CANDIDATURES_OBJECTIF) * SCORE_WEIGHTS.candidatures,
      ),
      max: SCORE_WEIGHTS.candidatures,
      hint: `${jeune.candidatures} candidature${jeune.candidatures > 1 ? "s" : ""}`,
      action: "Voir les offres",
      href: "/espace-jeune/offres",
      icon: "send",
    },
  ];
}

/** Score global (0–100) dérivé du profil. */
export function computeScoreJeune(jeune: Jeune): number {
  const total = scoreParts(jeune).reduce((sum, p) => sum + p.points, 0);
  return Math.max(0, Math.min(100, total));
}

/** Levier qui rapporterait le plus de points — sert à orienter le jeune. */
export function prochainLevier(jeune: Jeune): ScorePart | null {
  const restants = scoreParts(jeune).filter((p) => p.points < p.max);
  if (restants.length === 0) return null;
  return restants.reduce((best, p) => (p.max - p.points > best.max - best.points ? p : best));
}

/** Palier atteint, affiché à côté du score. */
export function scoreLevel(score: number): { label: string; icon: IconName } {
  if (score >= 85) return { label: "Profil d'excellence", icon: "military_tech" };
  if (score >= 65) return { label: "Profil confirmé", icon: "trending_up" };
  if (score >= 40) return { label: "Profil prometteur", icon: "rocket_launch" };
  return { label: "Profil à construire", icon: "flag" };
}
