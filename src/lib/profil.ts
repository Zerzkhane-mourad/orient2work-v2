import type { Jeune } from "./types";

/**
 * Profile completion criteria (§5.2). Each filled item contributes equally,
 * so the learner sees exactly which sections still move the needle.
 */
const CRITERIA: { label: string; isFilled: (j: Jeune) => boolean }[] = [
  { label: "Informations personnelles", isFilled: (j) => Boolean(j.prenom && j.nom && j.email && j.telephone && j.ville) },
  { label: "Photo de profil", isFilled: (j) => Boolean(j.photo) },
  { label: "Présentation", isFilled: (j) => Boolean(j.bio && j.bio.trim().length >= 40) },
  { label: "Titre professionnel", isFilled: (j) => Boolean(j.titre) },
  { label: "Parcours académique", isFilled: (j) => Boolean(j.niveauEtudes && j.etablissement && j.filiere) },
  { label: "Au moins une expérience", isFilled: (j) => j.experiences.length > 0 },
  { label: "Au moins 3 compétences", isFilled: (j) => j.competences.length >= 3 },
  { label: "Au moins une langue", isFilled: (j) => j.langues.length > 0 },
  { label: "Au moins un lien", isFilled: (j) => j.liens.length > 0 },
];

/** Completion percentage (0–100) derived from the profile's contents. */
export function computeProfilCompletion(jeune: Jeune): number {
  const filled = CRITERIA.filter((c) => c.isFilled(jeune)).length;
  return Math.round((filled / CRITERIA.length) * 100);
}

/** Sections still to complete — used to nudge the learner. */
export function missingProfilItems(jeune: Jeune): string[] {
  return CRITERIA.filter((c) => !c.isFilled(jeune)).map((c) => c.label);
}
