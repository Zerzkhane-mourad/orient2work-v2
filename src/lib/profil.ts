import type { Jeune } from "./types";

/**
 * Critères de complétion du profil (§5.2).
 *
 * Miroir EXACT de `backend/src/domain/profil.ts` : mêmes contrôles, mêmes poids.
 * Le pourcentage affiché vient du serveur ; ce fichier ne sert plus qu'à dire au
 * jeune *ce qui* lui manque. Si les deux listes divergeaient, l'anneau
 * afficherait 94 % à côté d'un « Profil complet 🎉 ».
 *
 * Les critères sont regroupés par section d'édition : « Informations
 * personnelles » couvre plusieurs champs du backend, mais renvoie l'utilisateur
 * vers un seul formulaire.
 */
interface Criterion {
  label: string;
  /** Somme des poids backend couverts par ce critère. */
  weight: number;
  isFilled: (j: Jeune) => boolean;
}

const filled = (value?: string | null) => Boolean(value && value.trim().length > 0);

const CRITERIA: Criterion[] = [
  {
    label: "Informations personnelles",
    // prenom + nom + telephone + ville (1 point chacun côté backend)
    weight: 4,
    isFilled: (j) => filled(j.prenom) && filled(j.nom) && filled(j.telephone) && filled(j.ville),
  },
  { label: "Titre professionnel", weight: 1, isFilled: (j) => filled(j.titre) },
  {
    label: "Parcours académique",
    // niveauEtudes + etablissement + filiere
    weight: 3,
    isFilled: (j) => filled(j.niveauEtudes) && filled(j.etablissement) && filled(j.filiere),
  },
  {
    label: "Présentation (30 caractères minimum)",
    weight: 1,
    isFilled: (j) => Boolean(j.bio && j.bio.trim().length >= 30),
  },
  { label: "Photo de profil", weight: 1, isFilled: (j) => Boolean(j.photo) },
  { label: "Au moins 3 compétences", weight: 2, isFilled: (j) => j.competences.length >= 3 },
  { label: "Au moins une langue", weight: 1, isFilled: (j) => j.langues.length >= 1 },
  { label: "Au moins une expérience", weight: 2, isFilled: (j) => j.experiences.length >= 1 },
  { label: "Au moins un lien", weight: 1, isFilled: (j) => j.liens.length >= 1 },
];

const TOTAL_WEIGHT = CRITERIA.reduce((sum, criterion) => sum + criterion.weight, 0);

/**
 * Pourcentage de complétion (0–100).
 *
 * Conservé pour les vues qui n'ont pas de profil serveur sous la main (fiche
 * talent publique). Sur l'Espace Jeune, c'est la valeur renvoyée par l'API qui
 * fait foi.
 */
export function computeProfilCompletion(jeune: Jeune): number {
  const acquired = CRITERIA.reduce(
    (sum, criterion) => sum + (criterion.isFilled(jeune) ? criterion.weight : 0),
    0,
  );
  return Math.round((acquired / TOTAL_WEIGHT) * 100);
}

/** Sections encore à compléter — sert à orienter le jeune. */
export function missingProfilItems(jeune: Jeune): string[] {
  return CRITERIA.filter((criterion) => !criterion.isFilled(jeune)).map((c) => c.label);
}
